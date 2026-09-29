package com.example.taskboard;

import static com.tngtech.archunit.core.domain.JavaCall.Predicates.target;
import static com.tngtech.archunit.core.domain.JavaClass.Predicates.assignableTo;
import static com.tngtech.archunit.core.domain.properties.CanBeAnnotated.Predicates.metaAnnotatedWith;
import static com.tngtech.archunit.core.domain.properties.HasOwner.Predicates.With.owner;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.classes;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;
import static com.tngtech.archunit.library.Architectures.layeredArchitecture;

import com.example.taskboard.domain.DomainException;
import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.junit.AnalyzeClasses;
import com.tngtech.archunit.junit.ArchTest;
import com.tngtech.archunit.lang.ArchRule;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

/**
 * Architecture: the rules of AGENTS.md, executable. If one fails, fix the code, not the test.
 *
 * <p>Each rule says why it exists, so its failure message names the rule, the offender and the fix.
 */
@AnalyzeClasses(packages = "com.example.taskboard", importOptions = ImportOption.DoNotIncludeTests.class)
class ArchitectureTest {

    @ArchTest
    static final ArchRule layersOnlyDependDownwards = layeredArchitecture()
            .consideringOnlyDependenciesInLayers()
            .layer("api").definedBy("..api..")
            .layer("service").definedBy("..service..")
            .layer("repository").definedBy("..repository..")
            .layer("events").definedBy("..events..")
            .layer("config").definedBy("..config..")
            .layer("domain").definedBy("..domain..")
            .whereLayer("api").mayNotBeAccessedByAnyLayer()
            .whereLayer("events").mayNotBeAccessedByAnyLayer()
            .whereLayer("service").mayOnlyBeAccessedByLayers("api")
            .whereLayer("repository").mayOnlyBeAccessedByLayers("service")
            .whereLayer("config").mayOnlyBeAccessedByLayers("service")
            .because("imports point only downwards; move the code to a package that may depend on it (AGENTS.md, 'Where things go')");

    @ArchTest
    static final ArchRule theDomainIsFreeOfFrameworks = classes()
            .that().resideInAPackage("..domain..")
            .should().onlyDependOnClassesThat().resideInAnyPackage("java..", "..domain..")
            .because("the domain uses only the JDK; move framework code outward");

    @ArchTest
    static final ArchRule onlyConfigReadsTheEnvironment = noClasses()
            .that().resideOutsideOfPackage("..config..")
            .should().callMethod(System.class, "getenv", String.class)
            .orShould().dependOnClassesThat().areAssignableTo(Environment.class)
            .orShould().dependOnClassesThat().areAssignableTo(Value.class)
            .because("settings are fields of AppProperties, passed through a constructor");

    @ArchTest
    static final ArchRule onlyRepositoriesSpeakSql = noClasses()
            .that().resideOutsideOfPackage("..repository..")
            .should().dependOnClassesThat().resideInAnyPackage("java.sql..", "javax.sql..", "org.springframework.jdbc..")
            .because("data operations belong in a repository method");

    @ArchTest
    static final ArchRule onlyTheApiSpeaksHttp = noClasses()
            .that().resideOutsideOfPackage("..api..")
            .should().dependOnClassesThat().resideInAnyPackage("org.springframework.web..", "org.springframework.http..")
            .because("failures are DomainExceptions; ApiExceptionHandler alone turns them into HTTP");

    @ArchTest
    static final ArchRule onlyEventHandlersHaveSideEffects = noClasses()
            .that().resideOutsideOfPackage("..events..")
            .should().dependOnClassesThat().resideInAnyPackage("org.slf4j..", "java.util.logging..", "org.apache.commons.logging..")
            .because("side effects (logs, mail, audit) listen for a domain event; publish one instead");

    @ArchTest
    static final ArchRule controllersDecideNothing = noClasses()
            .that().resideInAPackage("..api..")
            .should().callConstructorWhere(target(owner(assignableTo(DomainException.class))))
            .because("controllers translate; put the rule on the entity if it concerns one task, otherwise in the service");

    @ArchTest
    static final ArchRule onlySpringConstructsCollaborators = noClasses()
            .should().callConstructorWhere(target(owner(metaAnnotatedWith(Component.class))))
            .because("Spring constructs collaborators; take them as constructor arguments");
}
